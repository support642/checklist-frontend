import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { authFetch } from '../../utils/authFetch';
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Loader2,
  Settings,
  Calendar,
  IndianRupee,
  Users,
  Award
} from 'lucide-react';
import { 
  PieChart,
  Pie,
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { hasPageAccess, hasModifyAccess } from '../../utils/permissionUtils';

const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b'];

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md`}>
    <div className={`${bg} ${color} p-3 rounded-xl`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

const MiniStatCard = ({ title, value, icon: Icon, color, bg, subValue }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-1 transition-all hover:shadow-md h-full">
    <div className="flex items-center justify-between mb-1">
      <div className={`${bg} ${color} p-2 rounded-lg`}>
        <Icon size={16} />
      </div>
      {subValue && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{subValue}</span>}
    </div>
    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{title}</p>
    <h3 className="text-lg font-bold text-slate-900 truncate">{value}</h3>
  </div>
);

const RepairDashboard = () => {
  const [stats, setStats] = React.useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0
  });
  const [vendorStats, setVendorStats] = React.useState([]);
  const [recentRequests, setRecentRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/repair`);
        const data = await response.json();
        
        if (response.ok) {
          const repairs = data.repairs || [];
          setStats({
            total: repairs.length,
            // Technician stage: Not Completed/Approved/Rejected
            pending: repairs.filter(r => 
              r.status !== 'Approved' && 
              r.status !== 'Completed' && 
              r.status !== '✅ Completed (कार्य पूर्ण)' && 
              r.status !== 'Cancelled'
            ).length,
            // Awaiting Admin: Needs Approval
            approved: repairs.filter(r => r.status === 'Completed' || r.status === '✅ Completed (कार्य पूर्ण)').length,
            // Finalized: Admin Approved
            completed: repairs.filter(r => r.status === 'Approved').length
          });

          // Aggregate vendor costs for approved repairs
          const approvedRepairs = repairs.filter(r => r.status === 'Approved');
          const vendorMap = {};
          approvedRepairs.forEach(r => {
            const vendor = r.vendor_name || 'Unassigned';
            const amount = parseFloat(r.bill_amount) || 0;
            vendorMap[vendor] = (vendorMap[vendor] || 0) + amount;
          });

          const processedVendorData = Object.keys(vendorMap)
            .map(vendor => ({ 
              name: vendor.length > 15 ? vendor.substring(0, 15) + '...' : vendor, 
              fullName: vendor,
              cost: vendorMap[vendor] 
            }))
            .sort((a, b) => b.cost - a.cost);
          
          setVendorStats(processedVendorData);
          setRecentRequests(repairs.slice(0, 5));
        }
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusClasses = (status) => {
    switch (status) {
      case 'Pending':
      case 'Pending (लंबित)':
        return 'bg-amber-100 text-amber-600';
      case 'Completed':
      case '✅ Completed (कार्य पूर्ण)':
        return 'bg-yellow-100 text-yellow-600';
      case 'Approved':
        return 'bg-green-100 text-green-600';
      case 'Rejected':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getDisplayStatus = (status) => {
    if (status === 'Completed' || status === '✅ Completed (कार्य पूर्ण)') return 'Pending Approval';
    if (status === 'Approved') return 'Completed';
    return status;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <Loader2 className="animate-spin h-10 w-10 text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="text-purple-600" />
                Repair Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">System-wide repair task overview</p>
            </div>
            {hasModifyAccess('repair_request_form') && (
              <Link 
                to="/repair/request-form"
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg text-sm"
              >
                <Plus size={18} /> New Request
              </Link>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Requests" 
              value={stats.total} 
              icon={Wrench} 
              color="text-blue-600" 
              bg="bg-blue-50" 
            />
            <StatCard 
              title="Pending" 
              value={stats.pending} 
              icon={Clock} 
              color="text-amber-600" 
              bg="bg-amber-50" 
            />
            <StatCard 
              title="Pending Approval" 
              value={stats.approved} 
              icon={Settings} 
              color="text-yellow-600" 
              bg="bg-yellow-50" 
            />
            <StatCard 
              title="Completed" 
              value={stats.completed} 
              icon={CheckCircle} 
              color="text-green-600" 
              bg="bg-green-50" 
            />
          </div>

          {/* Vendor-wise Cost Analysis Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Vendor-wise Cost Analysis</h2>
              <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold border border-purple-100 italic">
                Approved Requests Only
              </div>
            </div>

            {/* Vendor KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniStatCard 
                title="Total Repair Cost" 
                value={`₹${(vendorStats.reduce((sum, v) => sum + v.cost, 0)).toLocaleString()}`}
                icon={IndianRupee} 
                color="text-purple-600" 
                bg="bg-purple-50" 
              />
              <MiniStatCard 
                title="Total Vendors" 
                value={vendorStats.length}
                icon={Users} 
                color="text-blue-600" 
                bg="bg-blue-50" 
              />
              <MiniStatCard 
                title="Avg Cost / Vendor" 
                value={`₹${vendorStats.length > 0 ? Math.round(vendorStats.reduce((sum, v) => sum + v.cost, 0) / vendorStats.length).toLocaleString() : 0}`}
                icon={TrendingUp} 
                color="text-indigo-600" 
                bg="bg-indigo-50" 
              />
              <MiniStatCard 
                title="Top Vendor" 
                value={vendorStats[0]?.fullName || 'N/A'}
                subValue={vendorStats[0] ? `₹${vendorStats[0].cost.toLocaleString()}` : null}
                icon={Award} 
                color="text-amber-600" 
                bg="bg-amber-50" 
              />
            </div>

            {/* Donut Chart - Conditional Display */}
            {vendorStats.length >= 2 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Cost Distribution</h2>
                    <p className="text-slate-500 text-[11px] mt-1">Percentage share of expenditures per vendor</p>
                  </div>
                </div>
                
                <div className="h-[350px] w-full flex flex-col md:flex-row items-center justify-around gap-4">
                  <div className="h-full w-full md:w-3/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={vendorStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="cost"
                        >
                          {vendorStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => {
                            const total = vendorStats.reduce((sum, v) => sum + v.cost, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return [`₹${value.toLocaleString()} (${percent}%)`, props.payload.fullName];
                          }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          align="center"
                          wrapperStyle={{ paddingTop: '20px' }}
                          formatter={(value, entry) => <span className="text-xs font-medium text-slate-600">{entry.payload.fullName}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Decorative Center Info - shown only if space permits */}
                  <div className="hidden lg:flex flex-col items-center justify-center text-center p-4">
                    <div className="text-slate-400 text-xs mb-1">Total Market Share</div>
                    <div className="text-2xl font-bold text-slate-900">100%</div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest border-t pt-1 border-slate-100">Approved Spend</div>
                  </div>
                </div>
              </div>
            )}
            
            {vendorStats.length === 1 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100 flex items-center justify-center text-center">
                <div className="max-w-md">
                  <Award size={32} className="text-purple-600 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">All approved repairs are currently managed by <span className="font-bold text-purple-700"> {vendorStats[0].fullName}</span>.</p>
                  <p className="text-slate-500 text-xs mt-1 italic">Comparison charts will appear once multiple vendors are registered in approved requests.</p>
                </div>
              </div>
            )}

            {vendorStats.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                <AlertCircle size={40} className="text-slate-200 mb-2" />
                <p className="text-slate-500 text-sm">No approved vendor expenditure recorded yet.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                {hasPageAccess('repair_pending_request') && (
                  <Link to="/repair/pending-request" className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group">
                    <div className="bg-amber-100 text-amber-600 p-2.5 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Clock size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">View Pending</p>
                      <p className="text-xs text-slate-500">{stats.pending} tasks awaiting attention</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-purple-600 transform group-hover:translate-x-1 transition-all" />
                  </Link>
                )}
                
                {hasPageAccess('repair_request_approval') && (
                  <Link to="/repair/request-approval" className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group">
                    <div className="bg-green-100 text-green-600 p-2.5 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">Approve Requests</p>
                      <p className="text-xs text-slate-500">Review submitted work reports</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-purple-600 transform group-hover:translate-x-1 transition-all" />
                  </Link>
                )}

                <div className="p-6 bg-purple-50 flex items-center justify-between mt-2">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Efficiency</p>
                    <h4 className="text-xl font-bold text-slate-900">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% 
                    </h4>
                    <p className="text-[10px] text-slate-500">Completion Rate</p>
                  </div>
                  <TrendingUp className="text-purple-600 opacity-20" size={48} />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {recentRequests.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {recentRequests.map(req => (
                      <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${getStatusClasses(req.status)}`}>
                            {req.machine_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate text-sm">{req.machine_name}</p>
                            <p className="text-xs text-slate-500 truncate">{req.issue_description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end justify-center">
                          <p className="text-xs font-mono text-slate-400 mb-1">{req.id}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-block ${getStatusClasses(req.status)}`}>
                            {getDisplayStatus(req.status)}
                          </span>
                          {(req.status === 'Approved' || req.status === 'Rejected') && (
                            <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase">
                              By {req.admin_approved_by || 'Admin'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto mb-2 text-slate-200" size={32} />
                    <p className="text-sm">No activity recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RepairDashboard;