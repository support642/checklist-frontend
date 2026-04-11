import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, CreditCard, FileText, RefreshCw, Save, X, Edit } from 'lucide-react';
import useHeaderStore from '../../../store/headerStore';
import { formatDate } from '../../../utils/doc-utils/dateFormatter';
import AddSubscription from './AddSubscription';
import { fetchAllSubscriptions, updateSubscription, SubscriptionResponse } from '../../../utils/doc-utils/subscriptionApi';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';

// Map backend response to frontend format
interface SubscriptionDisplay {
  id: string;
  sn: string;
  requestedDate: string;
  companyName: string;
  subscriberName: string;
  subscriptionName: string;
  price: string;
  frequency: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: string;
}

function mapSubscription(item: SubscriptionResponse): SubscriptionDisplay {
  // Determine status based on dates
  let status = '';
  if (item.actual_3) {
    status = 'Paid';
  } else if (item.actual_2) {
    status = 'Approved';
  } else if (item.actual_1) {
    status = 'Pending';
  }

  // Helper to ensure YYYY-MM-DD for date inputs
  const toDateString = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
  };

  return {
    id: String(item.id),
    sn: item.subscription_no,
    requestedDate: toDateString(item.timestamp),
    companyName: item.company_name || '',
    subscriberName: item.subscriber_name || '',
    subscriptionName: item.subscription_name || '',
    price: item.price || '',
    frequency: item.frequency || '',
    purpose: item.purpose || '',
    startDate: toDateString(item.start_date),
    endDate: toDateString(item.end_date),
    status
  };
}

const AllSubscriptions = () => {
  const { setTitle } = useHeaderStore();
  const [subscriptions, setSubscriptions] = useState<SubscriptionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role && ['admin', 'super_admin', 'div_admin'].includes(currentUser.role);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<SubscriptionDisplay>>({});

  const handleEdit = (item: SubscriptionDisplay) => {
      setEditingSubId(item.id);
      setEditFormData({ ...item });
  };

  const handleCancelEdit = () => {
      setEditingSubId(null);
      setEditFormData({});
  };

  const handleSaveEdit = async () => {
      if (!editingSubId) return;
      try {
          await updateSubscription(editingSubId, {
              companyName: editFormData.companyName || '',
              subscriberName: editFormData.subscriberName || '',
              subscriptionName: editFormData.subscriptionName || '',
              price: editFormData.price || '',
              frequency: editFormData.frequency || '',
              purpose: editFormData.purpose || '',
              // Type workaround since the API interface assumes pure creation payload
              ...({ 
                  startDate: editFormData.startDate, 
                  endDate: editFormData.endDate,
                  timestamp: editFormData.requestedDate 
              } as any)
          });
          toast.success('Subscription updated successfully');
          setEditingSubId(null);
          loadSubscriptions();
      } catch (err) {
          console.error('Update failed:', err);
          toast.error('Failed to update subscription');
      }
  };

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllSubscriptions();
      setSubscriptions(data.map(mapSubscription));
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser]);

  useEffect(() => {
    setTitle('All Subscription');
    loadSubscriptions();
  }, [setTitle, loadSubscriptions]);

  const filteredData = subscriptions.filter(item => {
    const matchesSearch = (item.subscriptionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subscriberName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesfreq = filterFrequency ? item.frequency === filterFrequency : true;

    const matchesRole = isAdmin || item.subscriberName === currentUser?.name;

    return matchesSearch && matchesfreq && matchesRole;
  });

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-input">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">All Subscriptions</h1>
            <p className="text-gray-500 text-sm mt-1">Track your recurring payments</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Search subscriptions..."
                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors w-full sm:w-auto"
              >
                <option value="">All Frequencies</option>
                {Array.from(new Set(subscriptions.map(s => s.frequency))).filter(Boolean).sort().map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadSubscriptions}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg transition-all"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add New</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>


        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-input">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Loading subscriptions...</span>
          </div>
        )}

        {/* Desktop Table */}
        {!loading && (
          <div className="hidden md:flex flex-col bg-white rounded-xl shadow-input overflow-hidden h-[calc(100vh-350px)]">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider whitespace-nowrap">
                    {isAdmin && (
                        <th className="px-3 py-2 w-20 text-center">Action</th>
                    )}
                    <th className="px-3 py-2">Serial No</th>
                    <th className="px-3 py-2">Requested Date</th>
                    <th className="px-3 py-2">Company Name</th>
                    <th className="px-3 py-2">Subscriber Name</th>
                    <th className="px-3 py-2">Subscription Name</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Frequency</th>
                    <th className="px-3 py-2">Purpose</th>
                    <th className="px-3 py-2">Start Date</th>
                    <th className="px-3 py-2">End Date</th>
                    <th className="px-3 py-2">Status</th>

                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {isAdmin && (
                          <td className="px-3 py-2 flex justify-center items-center gap-2 mt-1 border-b-0 border-t-0">
                              {editingSubId === item.id ? (
                                  <>
                                      <button onClick={handleSaveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                                          <Save size={16} />
                                      </button>
                                      <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                                          <X size={16} />
                                      </button>
                                  </>
                              ) : (
                                  <button onClick={() => handleEdit(item)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit">
                                      <Edit size={16} />
                                  </button>
                              )}
                          </td>
                      )}
                      <td className="px-3 py-2 font-bold text-gray-700 text-xs">{item.sn}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {editingSubId === item.id ? (
                              <input type="date" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.requestedDate || ''} onChange={e => setEditFormData({...editFormData, requestedDate: e.target.value})} />
                          ) : formatDate(item.requestedDate)}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full min-w-[120px] p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.companyName || ''} onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} />
                          ) : item.companyName}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full min-w-[120px] p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.subscriberName || ''} onChange={e => setEditFormData({...editFormData, subscriberName: e.target.value})} />
                          ) : item.subscriberName}
                      </td>
                      <td className="px-3 py-2 font-medium text-purple-600">
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full min-w-[150px] p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.subscriptionName || ''} onChange={e => setEditFormData({...editFormData, subscriptionName: e.target.value})} />
                          ) : item.subscriptionName}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full min-w-[80px] p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.price || ''} onChange={e => setEditFormData({...editFormData, price: e.target.value})} />
                          ) : item.price}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                          {editingSubId === item.id ? (
                              <select className="w-full min-w-[100px] p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.frequency || ''} onChange={e => setEditFormData({...editFormData, frequency: e.target.value})}>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Quarterly">Quarterly</option>
                                  <option value="Half Yearly">Half Yearly</option>
                                  <option value="Yearly">Yearly</option>
                              </select>
                          ) : item.frequency}
                      </td>
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={item.purpose}>
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full min-w-[150px] p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.purpose || ''} onChange={e => setEditFormData({...editFormData, purpose: e.target.value})} />
                          ) : item.purpose}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-center">
                          {editingSubId === item.id ? (
                              <input type="date" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.startDate || ''} onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} />
                          ) : formatDate(item.startDate)}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-center">
                          {editingSubId === item.id ? (
                              <input type="date" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.endDate || ''} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} />
                          ) : formatDate(item.endDate)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Paid' ? 'bg-green-100 text-green-700' :
                            item.status === 'Approved' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                          {item.status || 'Pending'}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Cards */}
        {!loading && (
          <div className="md:hidden flex flex-col gap-4">
            {filteredData.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-input space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-start w-full">
                    <div className="h-10 w-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                      <CreditCard size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 justify-between w-full">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shadow-input border-none">{item.sn}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${item.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' :
                                item.status === 'Approved' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                            {item.status || 'Pending'}
                            </span>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-2">
                                {editingSubId === item.id ? (
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
                                )}
                            </div>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full p-1.5 mb-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.subscriptionName || ''} onChange={e => setEditFormData({...editFormData, subscriptionName: e.target.value})} placeholder="Subscription Name" />
                          ) : item.subscriptionName}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                          {editingSubId === item.id ? (
                              <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.companyName || ''} onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} placeholder="Company Name" />
                          ) : item.companyName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-3 border-t border-dashed border-gray-100">
                  <div>
                    <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Subscriber</span>
                    <span className="font-semibold text-gray-700">
                        {editingSubId === item.id ? (
                            <input type="text" className="w-full p-1 border border-gray-300 rounded mt-1 focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.subscriberName || ''} onChange={e => setEditFormData({...editFormData, subscriberName: e.target.value})} />
                        ) : item.subscriberName}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Price / Freq</span>
                    <span className="font-bold text-gray-900 flex gap-1">
                        {editingSubId === item.id ? (
                            <>
                                <input type="text" className="w-1/2 p-1 border border-gray-300 rounded mt-1 focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.price || ''} onChange={e => setEditFormData({...editFormData, price: e.target.value})} placeholder="Price" />
                                <select className="w-1/2 p-1 border border-gray-300 rounded mt-1 focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.frequency || ''} onChange={e => setEditFormData({...editFormData, frequency: e.target.value})}>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Half Yearly">Half Yearly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                            </>
                        ) : (
                            <>{item.price} <span className="text-gray-400 font-normal text-[10px]">/ {item.frequency}</span></>
                        )}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Purpose</span>
                    <span className="text-gray-700 leading-relaxed">
                        {editingSubId === item.id ? (
                            <input type="text" className="w-full p-1 border border-gray-300 rounded mt-1 focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.purpose || ''} onChange={e => setEditFormData({...editFormData, purpose: e.target.value})} />
                        ) : item.purpose}
                    </span>
                  </div>
                </div>

                {/* Dates Footer */}
                <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-[10px] border border-gray-100">
                  <div>
                    <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Req. Date</span>
                    <span className="font-mono text-gray-600 font-bold">
                        {editingSubId === item.id ? (
                            <input type="date" className="w-full p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.requestedDate || ''} onChange={e => setEditFormData({...editFormData, requestedDate: e.target.value})} />
                        ) : formatDate(item.requestedDate)}
                    </span>
                  </div>
                  <div className="text-center pl-2 border-l border-gray-200">
                    <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Start</span>
                    <span className="font-mono text-indigo-600 font-bold">
                        {editingSubId === item.id ? (
                            <input type="date" className="w-full p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.startDate || ''} onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} />
                        ) : formatDate(item.startDate)}
                    </span>
                  </div>
                  <div className="text-right pl-2 border-l border-gray-200">
                    <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">End</span>
                    <span className="font-mono text-amber-600 font-bold">
                        {editingSubId === item.id ? (
                            <input type="date" className="w-full p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={editFormData.endDate || ''} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} />
                        ) : formatDate(item.endDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <Search size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No subscriptions found</p>
              </div>
            )}
          </div>
        )}
      </div>
      <AddSubscription
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadSubscriptions}
      />
    </>
  );
};
export default AllSubscriptions;
